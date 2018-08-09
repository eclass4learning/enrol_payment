<?php

function apply_discount($instance) {
    $return = array("success" => true);
    $discount_amount = $instance->customdec1;
    $cost = $instance->cost;
    $new_cost = $cost;

    if($discount_amount < 0.00) {
        $return["success"] = false;
        return $return;
    }

    /**
     * "Discount type" field
     */
    switch ($instance->customint3) {
        case 0:
            //No discount - This shouldn't happen.
            $return["success"] = false;
            break;
        case 1:
            //Percent discount

            $normalized_amount = $discount_amount;

            //Percentages over 1 converted to a float between 0 and 1.
            if($discount_amount > 1.0) {
                $normalized_amount = $discount_amount * 0.01;
            }

            //New cost is the difference between the full cost and the percent discount.
            $new_cost = $cost - ($cost * $normalized_amount);
            break;
        case 2:
            //Value discount
            $new_cost = $cost - $discount_amount;
            break;
        default:
            //Error
            break;
    }

    $return['discounted_cost'] = format_float($new_cost, 2, false);
    $return['discounted_cost_localised'] = format_float($new_cost, 2, true);
    return $return;
}

