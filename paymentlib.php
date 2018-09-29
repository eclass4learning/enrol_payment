<?php

require_once(dirname(__FILE__).'/../../config.php');
require_once("$CFG->libdir/moodlelib.php");
require_once(dirname(__FILE__).'/lang/en/enrol_payment.php');

global $DB;

function get_payment_from_token($prepayToken) {
    global $DB;
    return $DB->get_record_sql('SELECT * FROM {enrol_payment_ipn}
                                  WHERE ' .$DB->sql_compare_text('prepaytoken') . ' = ? ',
                              array('prepaytoken' => $prepayToken));
}

/**
 * @param $instance enrol_payment instance
 * @param $payment payment object from enrol_payment_ipn
 * @return object with "subtotal" and "subtotal_localised" fields.
 */
function calculate_cost($instance, $payment, $addtax=false) {
    $discount_amount = $instance->customdec1;
    //$ret["discount_amount"] = $discount_amount;
    $cost = $payment->original_cost;
    $subtotal = $cost;

    if($payment->discounted && $discount_amount < 0.00) {
        throw new Exception(get_string("negativediscount", "enrol_payment"));
    }

    if($payment->units < 1) {
        throw new Exception(get_string("notenoughunits", "enrol_payment"));
    }

    if(!$payment->discounted) {
        $discount_amount = 0.0;
    }

    $oc_discounted = $cost;

    switch ($instance->customint3) {
        case 0:
            $subtotal = $cost * $payment->units;

            break;
        case 1:
            if($discount_amount > 100) {
                throw new Exception(get_string("percentdiscountover100error", "enrol_payment"));
            }

            //Percentages over 1 converted to a float between 0 and 1.
            if($discount_amount > 1.0) {
                $normalized_discount = $discount_amount * 0.01;
            } else {
                $normalized_discount = $discount_amount;
            }

            //Per-unit cost is the difference between the full cost and the percent discount.
            $per_unit_cost = $cost - ($cost * $normalized_discount);
            $subtotal = $per_unit_cost * $payment->units;

            $oc_discounted = $per_unit_cost;

            break;
        case 2:
            $oc_discounted = $cost - $discount_amount;
            $subtotal = ($cost - $discount_amount) * $payment->units;

            break;
        default:
            throw new Exception(get_string("discounttypeerror", "enrol_payment"));
            break;
    }

    if($payment->tax_amount && $addtax) {
        $subtotal_taxed = $subtotal + ($subtotal * $payment->tax_amount);
    } else {
        $subtotal_taxed = $subtotal;
    }

    $ret['subtotal'] = format_float($subtotal, 2, false);
    $ret['subtotal_localised'] = format_float($subtotal, 2, true);
    $ret['subtotal_taxed'] = format_float($subtotal_taxed, 2, true);
    $ret['oc_discounted'] = format_float($oc_discounted, 2, true);

    return $ret;
}
