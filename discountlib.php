<?php

/**
 * @param $instance enrol_ecommerce instance
 * @return object with "success", "discounted_cost", and "discounted_cost_localised" fields.
 */
function apply_discount($instance) {
    $return = array("success" => false);
    $discount_amount = $instance->customdec1;
    $return["discount_amount"] = $discount_amount;
    $cost = $instance->cost;
    $new_cost = $cost;

    if($discount_amount < 0.00) {
        $return["success"] = false;
        $return["failmessage"] = get_string("negativediscount", "enrol_ecommerce");
        return $return;
    }

    /**
     * "Discount type" field
     */
    switch ($instance->customint3) {
        case 0:
            //No discount - This shouldn't happen.
            $return["success"] = false;
            $return["failmessage"] = get_string('discounttypeerror', 'enrol_ecommerce');
            break;
        case 1:
            //Percent discount
            $return['discount_type'] = "percent";

            $normalized_amount = $discount_amount;

            //Percentages over 1 converted to a float between 0 and 1.
            if($discount_amount > 1.0) {
                $normalized_amount = $discount_amount * 0.01;
                $return['discount_amount'] = $normalized_amount;
            }

            if($discount_amount > 100) {
                $return['success'] = false;
                $return['failmessage'] = get_string('percentdiscountover100error', 'enrol_ecommerce');
            }

            //New cost is the difference between the full cost and the percent discount.
            $new_cost = $cost - ($cost * $normalized_amount);

            $return["success"] = true;
            break;
        case 2:
            //Value discount
            $return['discount_type'] = "value";
            $new_cost = $cost - $discount_amount;

            $return["success"] = true;
            break;
        default:
            //Error
            $return['success'] = false;
            $return["failmessage"] = get_string('discounttypeerror', 'enrol_ecommerce');
            break;
    }

    if ($return['succes'] = true) {
        $return['discounted_cost'] = format_float($new_cost, 2, false);
        $return['discounted_cost_localised'] = format_float($new_cost, 2, true);
    }
    return $return;
}

